using BackEnd.Shared.Models.CustomFields;

namespace BackEnd.Shared.Models.Quotes;

public class QuoteResponse
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? ValidityDate { get; set; }
    public string? EstimatedDuration { get; set; }
    public string? SiteAddress { get; set; }
    public decimal? AmountExclTax { get; set; }
    public decimal? TaxRate { get; set; }
    public decimal? AmountInclTax { get; set; }
    public string? ReminderDate { get; set; }
    public List<CustomFieldEntry>? CustomFields { get; set; }
    public string? LegalMentions { get; set; }
    public string? Notes { get; set; }
    public int CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<QuoteLineResponse> Lines { get; set; } = [];
}
