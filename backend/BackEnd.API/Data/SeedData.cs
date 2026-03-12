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
    }
}
