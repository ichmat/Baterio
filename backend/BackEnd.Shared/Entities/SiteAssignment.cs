namespace BackEnd.Shared.Entities;

public class SiteAssignment
{
    public int Id { get; set; }
    public int TenantId { get; set; }
    public int SiteId { get; set; }
    public int UserId { get; set; }
    public DateTime? StartDatetime { get; set; }
    public DateTime? EndDatetime { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Tenant Tenant { get; set; } = null!;
    public Site Site { get; set; } = null!;
    public User User { get; set; } = null!;
}
