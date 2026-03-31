using BackEnd.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("tenants");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).HasColumnName("id");
        builder.Property(t => t.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
        builder.Property(t => t.Subscription).HasColumnName("subscription").HasMaxLength(50);
        builder.Property(t => t.Configuration).HasColumnName("configuration").HasColumnType("json");
        builder.Property(t => t.QuoteRefYear).HasColumnName("quote_ref_year").HasDefaultValue(0);
        builder.Property(t => t.QuoteRefSequence).HasColumnName("quote_ref_sequence").HasDefaultValue(0);
        builder.Property(t => t.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(t => t.UpdatedAt).HasColumnName("updated_at");
    }
}
