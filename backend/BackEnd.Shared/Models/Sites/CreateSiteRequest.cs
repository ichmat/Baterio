using BackEnd.Shared.Models.CustomFields;

namespace BackEnd.Shared.Models.Sites;

public class CreateSiteRequest
{
    public int CustomerId { get; set; }
    public int? QuoteId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string SiteAddress { get; set; } = string.Empty;
    public string? StartDate { get; set; }  // ISO date string
    public string? EndDate { get; set; }    // ISO date string
    public List<CustomFieldEntry>? CustomFields { get; set; }
    public string? Notes { get; set; }
}
