using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Company;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class CompanyService : ICompanyService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<CompanyService> _logger;

    public CompanyService(AppDbContext db, ITenantContext tenantContext, ILogger<CompanyService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
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

        if (companyInfo == null)
        {
            companyInfo = new CompanyInfo
            {
                TenantId = _tenantContext.TenantId,
                CreatedAt = DateTime.UtcNow
            };
            _db.CompanyInfos.Add(companyInfo);
        }

        companyInfo.CompanyName = request.CompanyName;
        companyInfo.Address = request.Address;
        companyInfo.Siret = request.Siret;
        companyInfo.VatNumber = request.VatNumber;
        companyInfo.LegalForm = request.LegalForm;
        companyInfo.InsurancePolicyNumber = request.InsurancePolicyNumber;
        companyInfo.InsuranceProvider = request.InsuranceProvider;
        companyInfo.InsuranceCoverage = request.InsuranceCoverage;
        companyInfo.DefaultPaymentTerms = request.DefaultPaymentTerms;
        companyInfo.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

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
