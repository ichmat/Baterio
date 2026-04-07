namespace BackEnd.Shared.Models.SiteAssignments;

public class SiteAssignmentResponse
{
    public int Id { get; set; }
    public int SiteId { get; set; }
    public int UserId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string? UserAvatarUrl { get; set; }
    public DateTime? StartDatetime { get; set; }
    public DateTime? EndDatetime { get; set; }
    public DateTime CreatedAt { get; set; }
}
