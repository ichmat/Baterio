using System.Text.Json;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using Microsoft.EntityFrameworkCore;


namespace BackEnd.API.Data;

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext db)
    {
        // Idempotent: skip if tenant already exists
        if (await db.Tenants.IgnoreQueryFilters().AnyAsync(t => t.Name == "Baterio Dev"))
            return;

        var tenant = new Tenant
        {
            Name = "Baterio Dev",
            Configuration = "{\"maxUsers\": 10}",
            CreatedAt = DateTime.UtcNow
        };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var admin = new User
        {
            TenantId = tenant.Id,
            Email = "admin@baterio.fr",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            FirstName = "Admin",
            LastName = "Baterio",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(admin);

        var ouvrier = new User
        {
            TenantId = tenant.Id,
            Email = "ouvrier@baterio.fr",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Ouvrier123!"),
            FirstName = "Ouvrier",
            LastName = "Baterio",
            Role = UserRole.Ouvrier,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.Add(ouvrier);

        await db.SaveChangesAsync();

        var companyInfo = new CompanyInfo
        {
            TenantId = tenant.Id,
            CompanyName = "Baterio SARL",
            Address = "12 rue des Artisans, 75011 Paris",
            Siret = "12345678901234",
            VatNumber = "FR12345678901",
            LegalForm = "SARL",
            InsurancePolicyNumber = "DEC-2024-001234",
            InsuranceProvider = "AXA Assurances",
            InsuranceCoverage = "France metropolitaine",
            DefaultPaymentTerms = "Paiement a 30 jours",
            AssignmentPresets = JsonSerializer.Serialize(new[]
            {
                new { label = "Matin", startTime = "08:00", endTime = "12:00", order = 0 },
                new { label = "Après-midi", startTime = "12:00", endTime = "17:00", order = 1 },
                new { label = "Journée complète", startTime = "08:00", endTime = "17:00", order = 2 }
            }),
            CreatedAt = DateTime.UtcNow
        };
        db.CompanyInfos.Add(companyInfo);
        await db.SaveChangesAsync();

        // Custom Field Definitions
        var customFields = new[]
        {
            new CustomFieldDefinition
            {
                TenantId = tenant.Id,
                Label = "Surface m²",
                FieldType = FieldType.Number,
                ObligationLevel = ObligationLevel.Never,
                AppliesToQuotes = true,
                AppliesToSites = true,
                DisplayOrderQuotes = 0,
                DisplayOrderSites = 0,
                CreatedAt = DateTime.UtcNow
            },
            new CustomFieldDefinition
            {
                TenantId = tenant.Id,
                Label = "Type de travaux",
                FieldType = FieldType.SingleChoice,
                Options = JsonSerializer.Serialize(new { choices = new[] { "Neuf", "Renovation", "Extension", "Amenagement" } }),
                ObligationLevel = ObligationLevel.RequiredAtCreation,
                AppliesToQuotes = true,
                AppliesToSites = true,
                DisplayOrderQuotes = 1,
                DisplayOrderSites = 1,
                CreatedAt = DateTime.UtcNow
            },
            new CustomFieldDefinition
            {
                TenantId = tenant.Id,
                Label = "Date de debut souhaitee",
                FieldType = FieldType.Date,
                ObligationLevel = ObligationLevel.RequiredForSiteConversion,
                AppliesToQuotes = true,
                AppliesToSites = false,
                DisplayOrderQuotes = 2,
                DisplayOrderSites = null,
                CreatedAt = DateTime.UtcNow
            }
        };

        db.CustomFieldDefinitions.AddRange(customFields);
        await db.SaveChangesAsync();
    }
}
