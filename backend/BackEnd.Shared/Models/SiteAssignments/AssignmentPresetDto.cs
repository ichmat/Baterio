namespace BackEnd.Shared.Models.SiteAssignments;

public class AssignmentPresetDto
{
    public string Label { get; set; } = string.Empty;
    public string StartTime { get; set; } = string.Empty; // "HH:mm"
    public string EndTime { get; set; } = string.Empty;   // "HH:mm"
    public int Order { get; set; }
}
