namespace BackEnd.Shared.Models.SiteAssignments;

public class ConflictWarning
{
    public string Type { get; set; } = "info"; // "info" | "conflict"
    public string Message { get; set; } = string.Empty;
    public int? ConflictingSiteId { get; set; }
    public string? ConflictingSiteName { get; set; }
    public DateTime? ExistingStart { get; set; }
    public DateTime? ExistingEnd { get; set; }
}
