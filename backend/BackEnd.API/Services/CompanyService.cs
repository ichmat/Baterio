using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Company;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class CompanyService : ICompanyService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CompanyService> _logger;
    private readonly IAuditService _auditService;

    public CompanyService(AppDbContext db, ITenantContext tenantContext, ILogger<CompanyService> logger, IAuditService auditService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
        _auditService = auditService;
    }

    public async Task<CompanyInfoResponse> GetCompanyInfoAsync()
    {
        var companyInfo = await _db.CompanyInfos.FirstOrDefaultAsync();

        if (companyInfo == null)
        {
            return new CompanyInfoResponse();
        }

        return MapToResponse(companyInfo);
    }

    public async Task<CompanyInfoResponse> UpdateCompanyInfoAsync(UpdateCompanyInfoRequest request)
    {
        var companyInfo = await _db.CompanyInfos.FirstOrDefaultAsync();
        var isCreate = companyInfo == null;

        // Capture old values for diff (update only)
        string? oldCompanyName = null, oldAddress = null, oldSiret = null, oldVatNumber = null;
        string? oldLegalForm = null, oldInsurancePolicyNumber = null, oldInsuranceProvider = null;
        string? oldInsuranceCoverage = null, oldDefaultPaymentTerms = null;

        if (companyInfo == null)
        {
            companyInfo = new CompanyInfo
            {
                TenantId = _tenantContext.TenantId,
                CreatedAt = DateTime.UtcNow
            };
            _db.CompanyInfos.Add(companyInfo);
        }
        else
        {
            oldCompanyName = companyInfo.CompanyName;
            oldAddress = companyInfo.Address;
            oldSiret = companyInfo.Siret;
            oldVatNumber = companyInfo.VatNumber;
            oldLegalForm = companyInfo.LegalForm;
            oldInsurancePolicyNumber = companyInfo.InsurancePolicyNumber;
            oldInsuranceProvider = companyInfo.InsuranceProvider;
            oldInsuranceCoverage = companyInfo.InsuranceCoverage;
            oldDefaultPaymentTerms = companyInfo.DefaultPaymentTerms;
        }

        companyInfo.CompanyName = NullIfEmpty(request.CompanyName);
        companyInfo.Address = NullIfEmpty(request.Address);
        companyInfo.Siret = NullIfEmpty(request.Siret);
        companyInfo.VatNumber = NullIfEmpty(request.VatNumber);
        companyInfo.LegalForm = NullIfEmpty(request.LegalForm);
        companyInfo.InsurancePolicyNumber = NullIfEmpty(request.InsurancePolicyNumber);
        companyInfo.InsuranceProvider = NullIfEmpty(request.InsuranceProvider);
        companyInfo.InsuranceCoverage = NullIfEmpty(request.InsuranceCoverage);
        companyInfo.DefaultPaymentTerms = NullIfEmpty(request.DefaultPaymentTerms);

        if (companyInfo.Id != 0)
        {
            companyInfo.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        if (isCreate)
        {
            await _auditService.LogEventAsync("CompanyInfo", companyInfo.Id, AuditAction.Created,
                new
                {
                    request.CompanyName, request.Address, request.Siret, request.VatNumber,
                    request.LegalForm, request.InsurancePolicyNumber, request.InsuranceProvider,
                    request.InsuranceCoverage, request.DefaultPaymentTerms
                });
        }
        else
        {
            var changes = new Dictionary<string, object?>();
            if (companyInfo.CompanyName != oldCompanyName) changes["CompanyName"] = new { Old = oldCompanyName, New = companyInfo.CompanyName };
            if (companyInfo.Address != oldAddress) changes["Address"] = new { Old = oldAddress, New = companyInfo.Address };
            if (companyInfo.Siret != oldSiret) changes["Siret"] = new { Old = oldSiret, New = companyInfo.Siret };
            if (companyInfo.VatNumber != oldVatNumber) changes["VatNumber"] = new { Old = oldVatNumber, New = companyInfo.VatNumber };
            if (companyInfo.LegalForm != oldLegalForm) changes["LegalForm"] = new { Old = oldLegalForm, New = companyInfo.LegalForm };
            if (companyInfo.InsurancePolicyNumber != oldInsurancePolicyNumber) changes["InsurancePolicyNumber"] = new { Old = oldInsurancePolicyNumber, New = companyInfo.InsurancePolicyNumber };
            if (companyInfo.InsuranceProvider != oldInsuranceProvider) changes["InsuranceProvider"] = new { Old = oldInsuranceProvider, New = companyInfo.InsuranceProvider };
            if (companyInfo.InsuranceCoverage != oldInsuranceCoverage) changes["InsuranceCoverage"] = new { Old = oldInsuranceCoverage, New = companyInfo.InsuranceCoverage };
            if (companyInfo.DefaultPaymentTerms != oldDefaultPaymentTerms) changes["DefaultPaymentTerms"] = new { Old = oldDefaultPaymentTerms, New = companyInfo.DefaultPaymentTerms };

            if (changes.Count > 0)
            {
                await _auditService.LogEventAsync("CompanyInfo", companyInfo.Id, AuditAction.Updated, changes);
            }
        }

        _logger.LogInformation("CompanyInfo updated for tenant {TenantId}", _tenantContext.TenantId);

        return MapToResponse(companyInfo);
    }

    public async Task<SubscriptionInfoResponse> GetSubscriptionInfoAsync()
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .FirstAsync(t => t.Id == _tenantContext.TenantId);

        var activeUsers = await _db.Users.CountAsync(u => u.IsActive);

        int? maxUsers = null;
        var plan = "MVP Gratuit";

        if (tenant.Subscription != null)
        {
            plan = tenant.Subscription;
        }

        if (tenant.Configuration != null)
        {
            try
            {
                using var doc = JsonDocument.Parse(tenant.Configuration);
                if (doc.RootElement.TryGetProperty("maxUsers", out var maxUsersProp))
                {
                    maxUsers = maxUsersProp.GetInt32();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to parse tenant configuration");
            }
        }

        return new SubscriptionInfoResponse
        {
            Plan = plan,
            ActiveUsers = activeUsers,
            MaxUsers = maxUsers,
            TenantName = tenant.Name,
            CreatedAt = tenant.CreatedAt
        };
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;

    private static CompanyInfoResponse MapToResponse(CompanyInfo companyInfo)
    {
        return new CompanyInfoResponse
        {
            Id = companyInfo.Id,
            CompanyName = companyInfo.CompanyName,
            Address = companyInfo.Address,
            Siret = companyInfo.Siret,
            VatNumber = companyInfo.VatNumber,
            LegalForm = companyInfo.LegalForm,
            InsurancePolicyNumber = companyInfo.InsurancePolicyNumber,
            InsuranceProvider = companyInfo.InsuranceProvider,
            InsuranceCoverage = companyInfo.InsuranceCoverage,
            DefaultPaymentTerms = companyInfo.DefaultPaymentTerms,
            CreatedAt = companyInfo.CreatedAt,
            UpdatedAt = companyInfo.UpdatedAt
        };
    }
}
