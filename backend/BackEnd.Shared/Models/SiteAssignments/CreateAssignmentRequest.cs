namespace BackEnd.Shared.Models.SiteAssignments;

public class CreateAssignmentRequest
{
    public int UserId { get; set; }
    public string Mode { get; set; } = "full_duration"; // "full_duration" | "date_preset" | "range_preset" | "free"
    public string? Date { get; set; }          // ISO date for date_preset
    public string? StartDate { get; set; }     // ISO date for range_preset
    public string? EndDate { get; set; }       // ISO date for range_preset
    public string? PresetStartTime { get; set; } // "HH:mm" for date_preset / range_preset
    public string? PresetEndTime { get; set; }   // "HH:mm" for date_preset / range_preset
    public DateTime? StartDatetime { get; set; } // for free mode
    public DateTime? EndDatetime { get; set; }   // for free mode
}
