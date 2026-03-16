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
    public DbSet<CompanyInfo> CompanyInfos => Set<CompanyInfo>();
    public DbSet<CustomFieldDefinition> CustomFieldDefinitions => Set<CustomFieldDefinition>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

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
        // Filter is always applied; when CurrentTenantId == 0, no rows match (safe default)
        modelBuilder.Entity<User>().HasQueryFilter(u => u.TenantId == CurrentTenantId);
        modelBuilder.Entity<CompanyInfo>().HasQueryFilter(c => c.TenantId == CurrentTenantId);
        modelBuilder.Entity<CustomFieldDefinition>().HasQueryFilter(c => c.TenantId == CurrentTenantId);
        modelBuilder.Entity<AuditEvent>().HasQueryFilter(e => e.TenantId == CurrentTenantId);
    }
}
