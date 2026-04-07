using BackEnd.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class SiteConfiguration : IEntityTypeConfiguration<Site>
{
    public void Configure(EntityTypeBuilder<Site> builder)
    {
        builder.ToTable("sites");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
        builder.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
        builder.Property(e => e.QuoteId).HasColumnName("quote_id");
        builder.Property(e => e.CreatedBy).HasColumnName("created_by").IsRequired();
        builder.Property(e => e.Reference).HasColumnName("reference").HasMaxLength(50).IsRequired();
        builder.Property(e => e.Subject).HasColumnName("subject").HasColumnType("text").IsRequired();
        builder.Property(e => e.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(e => e.SiteAddress).HasColumnName("site_address").HasColumnType("text").IsRequired();
        builder.Property(e => e.StartDate).HasColumnName("start_date");
        builder.Property(e => e.EndDate).HasColumnName("end_date");
        builder.Property(e => e.CustomFields).HasColumnName("custom_fields").HasColumnType("json");
        builder.Property(e => e.Notes).HasColumnName("notes").HasColumnType("text");
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(e => e.TenantId);
        builder.HasIndex(e => new { e.TenantId, e.CustomerId });
        builder.HasIndex(e => new { e.TenantId, e.Status });
        builder.HasIndex(e => new { e.TenantId, e.Reference }).IsUnique();

        builder.HasOne(e => e.Tenant)
            .WithMany()
            .HasForeignKey(e => e.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Customer)
            .WithMany()
            .HasForeignKey(e => e.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.CreatedByUser)
            .WithMany()
            .HasForeignKey(e => e.CreatedBy)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.Quote)
            .WithMany()
            .HasForeignKey(e => e.QuoteId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
