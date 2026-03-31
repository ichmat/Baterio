using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Entities;

public class Site
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int CustomerId { get; set; }
    public int? QuoteId { get; set; }
    public int CreatedBy { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public SiteStatus Status { get; set; } = SiteStatus.Planned;
    public string SiteAddress { get; set; } = string.Empty;
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public string? CustomFields { get; set; }  // JSON
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public Quote? Quote { get; set; }
}
