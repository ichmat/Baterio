using BackEnd.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class QuoteLineConfiguration : IEntityTypeConfiguration<QuoteLine>
{
    public void Configure(EntityTypeBuilder<QuoteLine> builder)
    {
        builder.ToTable("quote_lines");
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.QuoteId).HasColumnName("quote_id").IsRequired();
        builder.Property(e => e.Description).HasColumnName("description").HasColumnType("text").IsRequired();
        builder.Property(e => e.Quantity).HasColumnName("quantity").HasColumnType("decimal(10,2)");
        builder.Property(e => e.UnitPriceExclTax).HasColumnName("unit_price_excl_tax").HasColumnType("decimal(10,2)");
        builder.Property(e => e.DisplayOrder).HasColumnName("display_order");
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(e => e.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(e => new { e.QuoteId, e.DisplayOrder });
    }
}
