using BackEnd.Shared.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace BackEnd.API.Data.Configurations;

public class AuditEventConfiguration : IEntityTypeConfiguration<AuditEvent>
{
    public void Configure(EntityTypeBuilder<AuditEvent> builder)
    {
        builder.ToTable("audit_events");

        builder.HasKey(e => e.Id);
        builder.Property(e => e.Id).HasColumnName("id");
        builder.Property(e => e.EntityType).HasColumnName("entity_type").HasMaxLength(100).IsRequired();
        builder.Property(e => e.EntityId).HasColumnName("entity_id").IsRequired();
        builder.Property(e => e.TenantId).HasColumnName("tenant_id").IsRequired();
        builder.Property(e => e.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(e => e.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(50).IsRequired();
        builder.Property(e => e.Payload).HasColumnName("payload").HasColumnType("json");
        builder.Property(e => e.CreatedAt).HasColumnName("created_at").IsRequired();

        // Index pour retrouver l'historique d'un objet
        builder.HasIndex(e => new { e.EntityType, e.EntityId });
        // Index pour les vues chronologiques par tenant
        builder.HasIndex(e => new { e.TenantId, e.CreatedAt });
        // Index pour le Global Query Filter
        builder.HasIndex(e => e.TenantId);

        builder.HasOne(e => e.Tenant)
            .WithMany()
            .HasForeignKey(e => e.TenantId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
