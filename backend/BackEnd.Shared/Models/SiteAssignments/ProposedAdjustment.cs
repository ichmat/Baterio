namespace BackEnd.Shared.Models.SiteAssignments;

public class ProposedAdjustment
{
    public int AssignmentId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public DateTime? OldStartDatetime { get; set; }
    public DateTime? OldEndDatetime { get; set; }
    public DateTime? NewStartDatetime { get; set; }
    public DateTime? NewEndDatetime { get; set; }
    public string Action { get; set; } = "adjust";
}
