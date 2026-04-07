using BackEnd.Shared.Models.CustomFields;
using BackEnd.Shared.Models.SiteAssignments;

namespace BackEnd.Shared.Models.Sites;

public class SiteResponse
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public int? QuoteId { get; set; }
    public string? QuoteReference { get; set; }
    public string SiteAddress { get; set; } = string.Empty;
    public string? StartDate { get; set; }
    public string? EndDate { get; set; }
    public List<CustomFieldEntry>? CustomFields { get; set; }
    public string? Notes { get; set; }
    public int CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public AssignedWorkersInfo? AssignedWorkers { get; set; }
    public List<ProposedAdjustment>? ProposedAdjustments { get; set; }
}
