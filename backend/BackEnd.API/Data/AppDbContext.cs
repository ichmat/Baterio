using BackEnd.Shared.Entities;
using BackEnd.Shared.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Data;

public class AppDbContext : DbContext
{
    private readonly ITenantContext? _tenantContext;

    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    // Safe accessor for the query filter — returns 0 when no tenant context
    private int CurrentTenantId => _tenantContext?.TenantId ?? 0;

    public AppDbContext(DbContextOptions<AppDbContext> options, ITenantContext? tenantContext = null)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Global Query Filter — multi-tenancy row-level
        // When CurrentTenantId == 0, filter is disabled (no tenant context or not set)
        modelBuilder.Entity<User>().HasQueryFilter(u => CurrentTenantId == 0 || u.TenantId == CurrentTenantId);
    }
}
