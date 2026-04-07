using BackEnd.Shared.Models.SiteAssignments;

namespace BackEnd.Shared.Models.Planning;

public class SiteCalendarResponse
{
    public int Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SiteAddress { get; set; } = string.Empty;
    public string StartDate { get; set; } = string.Empty;
    public string EndDate { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public List<SiteAssignmentResponse> Assignments { get; set; } = [];
}
