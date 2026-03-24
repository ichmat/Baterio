using BackEnd.Shared.Models.CustomFields;

namespace BackEnd.Shared.Models.Quotes;

public class CreateQuoteRequest
{
    public int CustomerId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Priority { get; set; } = "Normal";
    public string? ValidityDate { get; set; }  // ISO date string
    public string? EstimatedDuration { get; set; }
    public string? SiteAddress { get; set; }
    public decimal? TaxRate { get; set; }
    public string? ReminderDate { get; set; }  // ISO date string
    public List<CustomFieldEntry>? CustomFields { get; set; } 
    public List<QuoteLineRequest>? Lines { get; set; }
}
