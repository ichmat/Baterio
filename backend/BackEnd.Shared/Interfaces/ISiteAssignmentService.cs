using BackEnd.Shared.Models.SiteAssignments;

namespace BackEnd.Shared.Interfaces;

public interface ISiteAssignmentService
{
    Task<List<SiteAssignmentResponse>> CreateAsync(int siteId, CreateAssignmentRequest request);
    Task<List<SiteAssignmentResponse>> CreateBatchAsync(int siteId, CreateBatchAssignmentRequest request);
    Task<SiteAssignmentResponse> UpdateAsync(int siteId, int assignmentId, UpdateAssignmentRequest request);
    Task DeleteAsync(int siteId, int assignmentId);
    Task<List<SiteAssignmentResponse>> GetBySiteAsync(int siteId);
    Task<List<ConflictWarning>> CheckConflictsAsync(int userId, DateTime? start, DateTime? end, int? excludeAssignmentId = null);
    Task<List<SiteAssignmentResponse>> ApplyAdjustmentsAsync(int siteId, List<AssignmentAdjustment> adjustments);
}
