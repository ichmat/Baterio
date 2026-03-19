namespace BackEnd.Shared.Models.Audit;

public class AuditEventQueryParams
{
    public string EntityType { get; set; } = string.Empty;
    public int? EntityId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
