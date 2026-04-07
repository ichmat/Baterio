using BackEnd.Shared.Models.CustomFields;

namespace BackEnd.Shared.Models.Sites;

public class UpdateSiteRequest
{
    public string Subject { get; set; } = string.Empty;
    public string SiteAddress { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public List<CustomFieldEntry>? CustomFields { get; set; }
    public string? Notes { get; set; }
}
