using BackEnd.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class QuoteConfiguration : IEntityTypeConfiguration<Quote>
{
    public void Configure(EntityTypeBuilder<Quote> builder)
    {
        builder.ToTable("quotes");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
        builder.Property(e => e.CustomerId).HasColumnName("customer_id").IsRequired();
        builder.Property(e => e.CreatedBy).HasColumnName("created_by").IsRequired();
        builder.Property(e => e.Reference).HasColumnName("reference").HasMaxLength(50).IsRequired();
        builder.Property(e => e.Subject).HasColumnName("subject").HasColumnType("text").IsRequired();
        builder.Property(e => e.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(e => e.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(e => e.ValidityDate).HasColumnName("validity_date");
        builder.Property(e => e.EstimatedDuration).HasColumnName("estimated_duration").HasMaxLength(100);
        builder.Property(e => e.SiteAddress).HasColumnName("site_address").HasColumnType("text");
        builder.Property(e => e.AmountExclTax).HasColumnName("amount_excl_tax").HasColumnType("decimal(10,2)");
        builder.Property(e => e.TaxRate).HasColumnName("tax_rate").HasColumnType("decimal(5,2)");
        builder.Property(e => e.AmountInclTax).HasColumnName("amount_incl_tax").HasColumnType("decimal(10,2)");
        builder.Property(e => e.ReminderDate).HasColumnName("reminder_date");
        builder.Property(e => e.CustomFields).HasColumnName("custom_fields").HasColumnType("json");
        builder.Property(e => e.LegalMentions).HasColumnName("legal_mentions").HasColumnType("text");
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

        builder.HasMany(q => q.Lines)
            .WithOne(l => l.Quote)
            .HasForeignKey(l => l.QuoteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
