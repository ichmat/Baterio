using BackEnd.API.Data;
using BackEnd.Shared.Entities;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.SiteAssignments;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class SiteAssignmentService : ISiteAssignmentService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IAuditService _auditService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SiteAssignmentService(AppDbContext db, ITenantContext tenantContext,
        IAuditService auditService, IHttpContextAccessor httpContextAccessor)
    {
        _db = db;
        _tenantContext = tenantContext;
        _auditService = auditService;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task<List<SiteAssignmentResponse>> CreateAsync(int siteId, CreateAssignmentRequest request)
    {
        var site = await _db.Sites.FirstOrDefaultAsync(s => s.Id == siteId)
            ?? throw new ApiErrorException(ApiError.AssignmentSiteNotFound);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId)
            ?? throw new ApiErrorException(ApiError.AssignmentWorkerNotFound);

        if (user.Role != UserRole.Ouvrier)
            throw new ApiErrorException(ApiError.AssignmentWorkerRoleRequired);

        if (site.StartDate == null && site.EndDate == null && request.Mode != "full_duration")
            throw new ApiErrorException(ApiError.AssignmentSiteDatesRequired);

        if (request.Mode == "full_duration")
        {
            var alreadyExists = await _db.SiteAssignments.AnyAsync(a =>
                a.SiteId == siteId && a.UserId == request.UserId && a.StartDatetime == null && a.EndDatetime == null);
            if (alreadyExists)
                throw new ApiErrorException(ApiError.AssignmentDuplicateFullDuration);
        }

        var assignments = BuildAssignments(site, request);
        _db.SiteAssignments.AddRange(assignments);
        await _db.SaveChangesAsync();

        foreach (var a in assignments)
        {
            await _auditService.LogEventAsync("SiteAssignment", a.Id, AuditAction.Created,
                new { a.SiteId, a.UserId, UserName = $"{user.LastName} {user.FirstName}".Trim(), a.StartDatetime, a.EndDatetime });
        }

        return assignments.Select(a => MapToResponse(a, user)).ToList();
    }

    public async Task<List<SiteAssignmentResponse>> CreateBatchAsync(int siteId, CreateBatchAssignmentRequest request)
    {
        if (request.Assignments == null || request.Assignments.Count == 0)
            throw new ApiErrorException(ApiError.AssignmentBatchEmpty);

        var site = await _db.Sites.FirstOrDefaultAsync(s => s.Id == siteId)
            ?? throw new ApiErrorException(ApiError.AssignmentSiteNotFound);

        var allAssignments = new List<SiteAssignment>();
        var userCache = new Dictionary<int, User>();

        foreach (var single in request.Assignments)
        {
            if (!userCache.TryGetValue(single.UserId, out var user))
            {
                user = await _db.Users.FirstOrDefaultAsync(u => u.Id == single.UserId)
                    ?? throw new ApiErrorException(ApiError.AssignmentWorkerNotFound);
                if (user.Role != UserRole.Ouvrier)
                    throw new ApiErrorException(ApiError.AssignmentWorkerRoleRequired);
                userCache[single.UserId] = user;
            }

            if (site.StartDate == null && site.EndDate == null && single.Mode != "full_duration")
                throw new ApiErrorException(ApiError.AssignmentSiteDatesRequired);

            if (single.Mode == "full_duration")
            {
                var alreadyExists = await _db.SiteAssignments.AnyAsync(a =>
                    a.SiteId == siteId && a.UserId == single.UserId && a.StartDatetime == null && a.EndDatetime == null);
                if (alreadyExists)
                    throw new ApiErrorException(ApiError.AssignmentDuplicateFullDuration);
            }

            allAssignments.AddRange(BuildAssignments(site, single));
        }

        _db.SiteAssignments.AddRange(allAssignments);
        await _db.SaveChangesAsync();

        foreach (var a in allAssignments)
        {
            var user = userCache[a.UserId];
            await _auditService.LogEventAsync("SiteAssignment", a.Id, AuditAction.Created,
                new { a.SiteId, a.UserId, UserName = $"{user.LastName} {user.FirstName}".Trim(), a.StartDatetime, a.EndDatetime });
        }

        return allAssignments.Select(a => MapToResponse(a, userCache[a.UserId])).ToList();
    }

    public async Task<SiteAssignmentResponse> UpdateAsync(int siteId, int assignmentId, UpdateAssignmentRequest request)
    {
        var assignment = await _db.SiteAssignments
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == assignmentId && a.SiteId == siteId)
            ?? throw new ApiErrorException(ApiError.AssignmentNotFound);

        // Validate: both must be provided or both null
        var hasStart = request.StartDatetime.HasValue;
        var hasEnd = request.EndDatetime.HasValue;
        if (hasStart != hasEnd)
            throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);

        if (hasStart && hasEnd && request.EndDatetime <= request.StartDatetime)
            throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);

        // Validate dates within site range
        if (hasStart && hasEnd)
        {
            var site = await _db.Sites.FirstOrDefaultAsync(s => s.Id == siteId)
                ?? throw new ApiErrorException(ApiError.AssignmentSiteNotFound);
            var tempAssignment = new SiteAssignment { StartDatetime = request.StartDatetime, EndDatetime = request.EndDatetime };
            ValidateAssignmentsWithinSiteDates([tempAssignment], site);
        }

        var oldStart = assignment.StartDatetime;
        var oldEnd = assignment.EndDatetime;

        assignment.StartDatetime = request.StartDatetime;
        assignment.EndDatetime = request.EndDatetime;
        assignment.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("SiteAssignment", assignmentId, AuditAction.Updated,
            new
            {
                StartDatetime = new { Old = oldStart, New = assignment.StartDatetime },
                EndDatetime = new { Old = oldEnd, New = assignment.EndDatetime }
            });

        return MapToResponse(assignment, assignment.User);
    }

    public async Task DeleteAsync(int siteId, int assignmentId)
    {
        var assignment = await _db.SiteAssignments
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == assignmentId && a.SiteId == siteId)
            ?? throw new ApiErrorException(ApiError.AssignmentNotFound);

        var userName = $"{assignment.User.LastName} {assignment.User.FirstName}".Trim();

        _db.SiteAssignments.Remove(assignment);
        await _db.SaveChangesAsync();

        await _auditService.LogEventAsync("SiteAssignment", assignmentId, AuditAction.Deleted,
            new { assignment.SiteId, assignment.UserId, UserName = userName, assignment.StartDatetime, assignment.EndDatetime });
    }

    public async Task<List<SiteAssignmentResponse>> GetBySiteAsync(int siteId)
    {
        var assignments = await _db.SiteAssignments
            .Include(a => a.User)
            .AsNoTracking()
            .Where(a => a.SiteId == siteId)
            .OrderBy(a => a.StartDatetime)
            .ThenBy(a => a.User.LastName)
            .ToListAsync();

        return assignments.Select(a => MapToResponse(a, a.User)).ToList();
    }

    public async Task<List<ConflictWarning>> CheckConflictsAsync(int siteId, int userId, DateTime? newStart, DateTime? newEnd, int? excludeAssignmentId = null)
    {
        // Validate site exists
        var siteExists = await _db.Sites.AnyAsync(s => s.Id == siteId);
        if (!siteExists)
            throw new ApiErrorException(ApiError.AssignmentSiteNotFound);

        var warnings = new List<ConflictWarning>();

        // Exclude assignments on the same site (no self-conflict)
        var existingAssignments = await _db.SiteAssignments
            .Include(a => a.Site)
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.SiteId != siteId && (excludeAssignmentId == null || a.Id != excludeAssignmentId))
            .ToListAsync();

        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        var userName = user != null ? $"{user.LastName} {user.FirstName}".Trim() : "Inconnu";

        foreach (var existing in existingAssignments)
        {
            if (existing.StartDatetime == null && existing.EndDatetime == null)
            {
                // Existing is "full duration" → info warning
                warnings.Add(new ConflictWarning
                {
                    Type = "info",
                    Message = $"{userName} est aussi attribué au chantier « {existing.Site.Subject} » pour toute sa durée",
                    ConflictingSiteId = existing.SiteId,
                    ConflictingSiteName = existing.Site.Subject,
                    ExistingStart = null,
                    ExistingEnd = null
                });
            }
            else if (newStart == null && newEnd == null)
            {
                // New is "full duration" → info for each precise existing
                warnings.Add(new ConflictWarning
                {
                    Type = "info",
                    Message = $"{userName} a aussi des créneaux précis sur « {existing.Site.Subject} »",
                    ConflictingSiteId = existing.SiteId,
                    ConflictingSiteName = existing.Site.Subject,
                    ExistingStart = existing.StartDatetime,
                    ExistingEnd = existing.EndDatetime
                });
            }
            else if (existing.StartDatetime.HasValue && existing.EndDatetime.HasValue
                     && newStart.HasValue && newEnd.HasValue)
            {
                // Both precise — check overlap: existStart < newEnd AND existEnd > newStart
                if (existing.StartDatetime < newEnd && existing.EndDatetime > newStart)
                {
                    warnings.Add(new ConflictWarning
                    {
                        Type = "conflict",
                        Message = $"{userName} a un créneau en conflit sur « {existing.Site.Subject} » ({existing.StartDatetime:dd/MM HH:mm} - {existing.EndDatetime:dd/MM HH:mm})",
                        ConflictingSiteId = existing.SiteId,
                        ConflictingSiteName = existing.Site.Subject,
                        ExistingStart = existing.StartDatetime,
                        ExistingEnd = existing.EndDatetime
                    });
                }
            }
        }

        return warnings;
    }

    public async Task<List<SiteAssignmentResponse>> ApplyAdjustmentsAsync(int siteId, List<AssignmentAdjustment> adjustments)
    {
        var site = await _db.Sites.FirstOrDefaultAsync(s => s.Id == siteId)
            ?? throw new ApiErrorException(ApiError.AssignmentSiteNotFound);

        var auditEntries = new List<(int Id, DateTime? OldStart, DateTime? OldEnd, DateTime? NewStart, DateTime? NewEnd)>();
        var assignmentIds = adjustments.Select(a => a.AssignmentId).ToList();

        var assignments = await _db.SiteAssignments
            .Include(a => a.User)
            .Where(a => assignmentIds.Contains(a.Id) && a.SiteId == siteId)
            .ToListAsync();

        if (assignments.Count != adjustments.Count)
            throw new ApiErrorException(ApiError.AssignmentNotFound);

        foreach (var adj in adjustments)
        {
            // Validate: both provided or both null, and start < end
            var hasStart = adj.NewStartDatetime.HasValue;
            var hasEnd = adj.NewEndDatetime.HasValue;
            if (hasStart != hasEnd)
                throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);
            if (hasStart && hasEnd && adj.NewEndDatetime <= adj.NewStartDatetime)
                throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);

            var assignment = assignments.First(a => a.Id == adj.AssignmentId);
            auditEntries.Add((assignment.Id, assignment.StartDatetime, assignment.EndDatetime, adj.NewStartDatetime, adj.NewEndDatetime));

            assignment.StartDatetime = adj.NewStartDatetime;
            assignment.EndDatetime = adj.NewEndDatetime;
            assignment.UpdatedAt = DateTime.UtcNow;
        }

        // Validate adjusted assignments are within site date range
        var preciseAssignments = assignments.Where(a => a.StartDatetime.HasValue && a.EndDatetime.HasValue).ToList();
        if (preciseAssignments.Count > 0)
            ValidateAssignmentsWithinSiteDates(preciseAssignments, site);

        await _db.SaveChangesAsync();

        foreach (var entry in auditEntries)
        {
            await _auditService.LogEventAsync("SiteAssignment", entry.Id, AuditAction.Updated,
                new
                {
                    Reason = "AdjustmentAfterSiteDateChange",
                    StartDatetime = new { Old = entry.OldStart, New = entry.NewStart },
                    EndDatetime = new { Old = entry.OldEnd, New = entry.NewEnd }
                });
        }

        return assignments.Select(a => MapToResponse(a, a.User)).ToList();
    }

    // --- Private helpers ---

    private List<SiteAssignment> BuildAssignments(Site site, CreateAssignmentRequest request)
    {
        var tenantId = _tenantContext.TenantId;
        var now = DateTime.UtcNow;

        var assignments = request.Mode switch
        {
            "full_duration" =>
                new List<SiteAssignment>
                {
                    new()
                    {
                        TenantId = tenantId, SiteId = site.Id, UserId = request.UserId,
                        StartDatetime = null, EndDatetime = null, CreatedAt = now
                    }
                },
            "date_preset" => BuildDatePresetAssignments(site.Id, tenantId, request, now),
            "range_preset" => BuildRangePresetAssignments(site.Id, tenantId, request, now),
            "free" => BuildFreeAssignments(site.Id, tenantId, request, now),
            _ => throw new ApiErrorException(ApiError.AssignmentInvalidMode)
        };

        // Validate all precise assignments are within site date range
        if (request.Mode != "full_duration")
            ValidateAssignmentsWithinSiteDates(assignments, site);

        return assignments;
    }

    private static void ValidateAssignmentsWithinSiteDates(List<SiteAssignment> assignments, Site site)
    {
        if (site.StartDate == null && site.EndDate == null) return;

        var siteStart = site.StartDate?.ToDateTime(TimeOnly.MinValue);
        var siteEnd = site.EndDate?.ToDateTime(TimeOnly.MaxValue);

        foreach (var a in assignments)
        {
            if (siteStart.HasValue && a.StartDatetime < siteStart)
                throw new ApiErrorException(ApiError.AssignmentOutsideSiteDateRange,
                    site.StartDate?.ToString("dd/MM/yyyy") ?? "", site.EndDate?.ToString("dd/MM/yyyy") ?? "");

            if (siteEnd.HasValue && a.EndDatetime > siteEnd)
                throw new ApiErrorException(ApiError.AssignmentOutsideSiteDateRange,
                    site.StartDate?.ToString("dd/MM/yyyy") ?? "", site.EndDate?.ToString("dd/MM/yyyy") ?? "");
        }
    }

    private static List<SiteAssignment> BuildDatePresetAssignments(int siteId, int tenantId, CreateAssignmentRequest request, DateTime now)
    {
        if (!DateOnly.TryParse(request.Date, out var date))
            throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);

        var (startTime, endTime) = ParsePresetTimes(request.PresetStartTime, request.PresetEndTime);

        return
        [
            new SiteAssignment
            {
                TenantId = tenantId, SiteId = siteId, UserId = request.UserId,
                StartDatetime = date.ToDateTime(startTime),
                EndDatetime = date.ToDateTime(endTime),
                CreatedAt = now
            }
        ];
    }

    private static List<SiteAssignment> BuildRangePresetAssignments(int siteId, int tenantId, CreateAssignmentRequest request, DateTime now)
    {
        if (!DateOnly.TryParse(request.StartDate, out var rangeStart) ||
            !DateOnly.TryParse(request.EndDate, out var rangeEnd) ||
            rangeEnd < rangeStart)
            throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);

        if (rangeEnd.DayNumber - rangeStart.DayNumber > 365)
            throw new ApiErrorException(ApiError.AssignmentRangeTooLarge);

        var (startTime, endTime) = ParsePresetTimes(request.PresetStartTime, request.PresetEndTime);

        var assignments = new List<SiteAssignment>();
        for (var date = rangeStart; date <= rangeEnd; date = date.AddDays(1))
        {
            assignments.Add(new SiteAssignment
            {
                TenantId = tenantId, SiteId = siteId, UserId = request.UserId,
                StartDatetime = date.ToDateTime(startTime),
                EndDatetime = date.ToDateTime(endTime),
                CreatedAt = now
            });
        }

        return assignments;
    }

    private static List<SiteAssignment> BuildFreeAssignments(int siteId, int tenantId, CreateAssignmentRequest request, DateTime now)
    {
        if (!request.StartDatetime.HasValue || !request.EndDatetime.HasValue ||
            request.EndDatetime <= request.StartDatetime)
            throw new ApiErrorException(ApiError.AssignmentInvalidDateRange);

        return
        [
            new SiteAssignment
            {
                TenantId = tenantId, SiteId = siteId, UserId = request.UserId,
                StartDatetime = request.StartDatetime.Value,
                EndDatetime = request.EndDatetime.Value,
                CreatedAt = now
            }
        ];
    }

    private static (TimeOnly startTime, TimeOnly endTime) ParsePresetTimes(string? startStr, string? endStr)
    {
        if (string.IsNullOrWhiteSpace(startStr) || string.IsNullOrWhiteSpace(endStr) ||
            !TimeOnly.TryParse(startStr, out var startTime) || !TimeOnly.TryParse(endStr, out var endTime) ||
            endTime <= startTime)
            throw new ApiErrorException(ApiError.AssignmentPresetInvalidTime);

        return (startTime, endTime);
    }

    private static SiteAssignmentResponse MapToResponse(SiteAssignment assignment, User user) => new()
    {
        Id = assignment.Id,
        SiteId = assignment.SiteId,
        UserId = assignment.UserId,
        UserFullName = $"{user.LastName} {user.FirstName}".Trim(),
        UserAvatarUrl = null, // no avatar in current User model
        StartDatetime = assignment.StartDatetime,
        EndDatetime = assignment.EndDatetime,
        CreatedAt = assignment.CreatedAt
    };
}
