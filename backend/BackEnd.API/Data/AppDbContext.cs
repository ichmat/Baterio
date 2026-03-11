using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        // Global Query Filters et configurations seront ajoutees dans les stories suivantes
    }
}
