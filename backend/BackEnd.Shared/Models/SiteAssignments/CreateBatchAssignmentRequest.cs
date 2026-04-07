namespace BackEnd.Shared.Models.SiteAssignments;

public class CreateBatchAssignmentRequest
{
    public List<CreateAssignmentRequest> Assignments { get; set; } = [];
}
