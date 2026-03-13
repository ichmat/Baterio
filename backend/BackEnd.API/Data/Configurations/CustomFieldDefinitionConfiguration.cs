using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class CustomFieldDefinitionConfiguration : IEntityTypeConfiguration<CustomFieldDefinition>
{
    public void Configure(EntityTypeBuilder<CustomFieldDefinition> builder)
    {
        builder.ToTable("custom_field_definitions");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.TenantId).HasColumnName("tenant_id").IsRequired();
        builder.Property(c => c.Label).HasColumnName("label").HasMaxLength(255).IsRequired();
        builder.Property(c => c.FieldType).HasColumnName("field_type").HasMaxLength(50).IsRequired()
            .HasConversion<string>();
        builder.Property(c => c.Options).HasColumnName("options").HasColumnType("json");
        builder.Property(c => c.ObligationLevel).HasColumnName("obligation_level").HasMaxLength(50).IsRequired()
            .HasConversion<string>();
        builder.Property(c => c.AppliesToQuotes).HasColumnName("applies_to_quotes").IsRequired();
        builder.Property(c => c.AppliesToSites).HasColumnName("applies_to_sites").IsRequired();
        builder.Property(c => c.DisplayOrder).HasColumnName("display_order").IsRequired();
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(c => new { c.TenantId, c.DisplayOrder });

        builder.HasOne(c => c.Tenant)
            .WithMany()
            .HasForeignKey(c => c.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
