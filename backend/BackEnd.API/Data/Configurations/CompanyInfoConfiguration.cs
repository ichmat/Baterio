using BackEnd.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class CompanyInfoConfiguration : IEntityTypeConfiguration<CompanyInfo>
{
    public void Configure(EntityTypeBuilder<CompanyInfo> builder)
    {
        builder.ToTable("company_info");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasColumnName("id");
        builder.Property(c => c.TenantId).HasColumnName("tenant_id").IsRequired();
        builder.Property(c => c.CompanyName).HasColumnName("company_name").HasMaxLength(255);
        builder.Property(c => c.Address).HasColumnName("address").HasMaxLength(500);
        builder.Property(c => c.Siret).HasColumnName("siret").HasMaxLength(14);
        builder.Property(c => c.VatNumber).HasColumnName("vat_number").HasMaxLength(20);
        builder.Property(c => c.LegalForm).HasColumnName("legal_form").HasMaxLength(100);
        builder.Property(c => c.InsurancePolicyNumber).HasColumnName("insurance_policy_number").HasMaxLength(100);
        builder.Property(c => c.InsuranceProvider).HasColumnName("insurance_provider").HasMaxLength(255);
        builder.Property(c => c.InsuranceCoverage).HasColumnName("insurance_coverage").HasMaxLength(255);
        builder.Property(c => c.DefaultPaymentTerms).HasColumnName("default_payment_terms").HasMaxLength(500);
        builder.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(c => c.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(c => c.TenantId).IsUnique();

        builder.HasOne(c => c.Tenant)
            .WithOne(t => t.CompanyInfo)
            .HasForeignKey<CompanyInfo>(c => c.TenantId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
