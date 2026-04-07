namespace BackEnd.Shared.Models.SiteAssignments;

public class AssignmentAdjustment
{
    public int AssignmentId { get; set; }
    public DateTime? NewStartDatetime { get; set; }
    public DateTime? NewEndDatetime { get; set; }
    public string Action { get; set; } = "adjust";
}
