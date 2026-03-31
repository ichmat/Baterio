using System.Text.RegularExpressions;
using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Customers;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class CustomerService : ICustomerService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;
    private readonly ILogger<CustomerService> _logger;

    public CustomerService(AppDbContext db, ITenantContext tenantContext, IAuditService auditService, ILogger<CustomerService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditService = auditService;
        _logger = logger;
    }

    public async Task<List<CustomerResponse>> GetAllAsync()
    {
        var customers = await _db.Customers
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .Select(c => MapToResponse(c))
            .ToListAsync();

        return customers;
    }

    public async Task<CustomerResponse?> GetByIdAsync(int id)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null)
            return null;

        return MapToResponse(customer);
    }

    public async Task<CustomerResponse> CreateAsync(CreateCustomerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.LastName))
            throw new ApiErrorException(ApiError.CustomerLastNameRequired);

        if (string.IsNullOrWhiteSpace(request.FirstName))
            throw new ApiErrorException(ApiError.CustomerFirstNameRequired);

        if (!string.IsNullOrWhiteSpace(request.Email) && !IsValidEmail(request.Email))
            throw new ApiErrorException(ApiError.CustomerInvalidEmail);

        var customer = new Customer
        {
            TenantId = _tenantContext.TenantId,
            LastName = request.LastName.Trim(),
            FirstName = request.FirstName.Trim(),
            Telephone = NullIfEmpty(request.Telephone),
            Email = NullIfEmpty(request.Email),
            Address = NullIfEmpty(request.Address),
            CreatedAt = DateTime.UtcNow
        };

        _db.Customers.Add(customer);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("Customer", customer.Id, AuditAction.Created,
            new { customer.LastName, customer.FirstName, customer.Telephone, customer.Email, customer.Address });

        _logger.LogInformation("Customer {CustomerId} created for tenant {TenantId}", customer.Id, _tenantContext.TenantId);

        return MapToResponse(customer);
    }

    public async Task<CustomerResponse> UpdateAsync(int id, UpdateCustomerRequest request)
    {
        var customer = await _db.Customers.FirstOrDefaultAsync(c => c.Id == id);

        if (customer == null)
            throw new ApiErrorException(ApiError.CustomerNotFound);

        if (string.IsNullOrWhiteSpace(request.LastName))
            throw new ApiErrorException(ApiError.CustomerLastNameRequired);

        if (string.IsNullOrWhiteSpace(request.FirstName))
            throw new ApiErrorException(ApiError.CustomerFirstNameRequired);

        if (!string.IsNullOrWhiteSpace(request.Email) && !IsValidEmail(request.Email))
            throw new ApiErrorException(ApiError.CustomerInvalidEmail);

        // Capture old values for audit diff
        var oldLastName = customer.LastName;
        var oldFirstName = customer.FirstName;
        var oldTelephone = customer.Telephone;
        var oldEmail = customer.Email;
        var oldAddress = customer.Address;

        customer.LastName = request.LastName.Trim();
        customer.FirstName = request.FirstName.Trim();
        customer.Telephone = NullIfEmpty(request.Telephone);
        customer.Email = NullIfEmpty(request.Email);
        customer.Address = NullIfEmpty(request.Address);

        var changes = new Dictionary<string, object?>();
        if (customer.LastName != oldLastName) changes["LastName"] = new { Old = oldLastName, New = customer.LastName };
        if (customer.FirstName != oldFirstName) changes["FirstName"] = new { Old = oldFirstName, New = customer.FirstName };
        if (customer.Telephone != oldTelephone) changes["Telephone"] = new { Old = oldTelephone, New = customer.Telephone };
        if (customer.Email != oldEmail) changes["Email"] = new { Old = oldEmail, New = customer.Email };
        if (customer.Address != oldAddress) changes["Address"] = new { Old = oldAddress, New = customer.Address };

        if (changes.Count > 0)
        {
            customer.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        if (changes.Count > 0)
        {
            await _auditService.LogEventAsync("Customer", id, AuditAction.Updated, changes);
        }

        _logger.LogInformation("Customer {CustomerId} updated for tenant {TenantId}", id, _tenantContext.TenantId);

        return MapToResponse(customer);
    }

    public async Task<List<CustomerSearchResult>> SearchAsync(string query, int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return [];

        var normalizedQuery = query.Trim();
        limit = Math.Clamp(limit, 1, 50);

        // Contains() → LIKE '%term%' en SQL. La collation MySQL utf8mb4_general_ci
        // gere le case-insensitive nativement — pas de .ToLower() pour permettre l'utilisation d'index.
        return await _db.Customers
            .Where(c =>
                c.LastName.Contains(normalizedQuery) ||
                c.FirstName.Contains(normalizedQuery) ||
                (c.Telephone != null && c.Telephone.Contains(normalizedQuery)) ||
                (c.Email != null && c.Email.Contains(normalizedQuery)))
            .OrderBy(c => c.LastName)
            .ThenBy(c => c.FirstName)
            .Take(limit)
            .Select(c => new CustomerSearchResult
            {
                Id = c.Id,
                LastName = c.LastName,
                FirstName = c.FirstName,
                Telephone = c.Telephone,
                Email = c.Email,
                QuoteCount = _db.Quotes.Count(q => q.CustomerId == c.Id),
                SiteCount = 0,  // TODO: LEFT JOIN sites quand la table existe
            })
            .ToListAsync();
    }

    private static bool IsValidEmail(string email)
    {
        return Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$");
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static CustomerResponse MapToResponse(Customer customer)
    {
        return new CustomerResponse
        {
            Id = customer.Id,
            LastName = customer.LastName,
            FirstName = customer.FirstName,
            Telephone = customer.Telephone,
            Email = customer.Email,
            Address = customer.Address,
            CreatedAt = customer.CreatedAt,
            UpdatedAt = customer.UpdatedAt
        };
    }
}
