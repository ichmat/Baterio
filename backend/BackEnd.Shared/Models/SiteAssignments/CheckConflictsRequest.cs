namespace BackEnd.Shared.Models.SiteAssignments;

public class CheckConflictsRequest
{
    public int UserId { get; set; }
    public DateTime? StartDatetime { get; set; }
    public DateTime? EndDatetime { get; set; }
    public int? ExcludeAssignmentId { get; set; }
}
