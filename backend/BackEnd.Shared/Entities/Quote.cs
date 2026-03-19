using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Entities;

public class Quote
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int CustomerId { get; set; }
    public int CreatedBy { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public QuoteStatus Status { get; set; } = QuoteStatus.Draft;
    public QuotePriority Priority { get; set; } = QuotePriority.Normal;
    public DateOnly? ValidityDate { get; set; }
    public string? EstimatedDuration { get; set; }
    public string? SiteAddress { get; set; }
    public decimal? AmountExclTax { get; set; }
    public decimal? TaxRate { get; set; }
    public decimal? AmountInclTax { get; set; }
    public DateOnly? ReminderDate { get; set; }
    public string? CustomFields { get; set; }  // JSON
    public string? LegalMentions { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Customer Customer { get; set; } = null!;
    public User CreatedByUser { get; set; } = null!;
    public List<QuoteLine> Lines { get; set; } = [];
}
