using System.Security.Claims;
using System.Text.Json;
using BackEnd.API.Data;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using BackEnd.Shared.Models.Users;
using Microsoft.EntityFrameworkCore;

namespace BackEnd.API.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<UserService> _logger;

    public UserService(AppDbContext db, ITenantContext tenantContext, IHttpContextAccessor httpContextAccessor, ILogger<UserService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public async Task<List<UserResponse>> GetAllUsersAsync()
    {
        return await _db.Users
            .OrderBy(u => u.LastName)
            .ThenBy(u => u.FirstName)
            // On retire le mot de passe de la réponse pour éviter qu'il soit 
            // charché inutilement et pour des raisons de sécurité
            // (chargé en RAM et potentiellement exposé dans les logs ou les dumps mémoire)
            .Select(u => new UserResponse
            {
                Id = u.Id,
                Email = u.Email,
                FirstName = u.FirstName ?? string.Empty,
                LastName = u.LastName ?? string.Empty,
                Role = u.Role.ToString(),
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<UserResponse> GetUserByIdAsync(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new ApiErrorException(ApiError.UserNotFound);

        return MapToResponse(user);
    }

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest request)
    {
        // Interdire la création d'un utilisateur Admin
        if (request.Role == UserRole.Admin)
            throw new ApiErrorException(ApiError.InvalidRole);

        // Vérifier unicité email dans le tenant
        var emailExists = await _db.Users
            .AnyAsync(u => u.Email == request.Email);

        if (emailExists)
            throw new ApiErrorException(ApiError.EmailAlreadyExists);

        // Vérifier la limite d'abonnement
        await CheckUserLimitAsync();

        var user = new BackEnd.Shared.Entities.User
        {
            TenantId = _tenantContext.TenantId,
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {Email} created in tenant {TenantId}", user.Email, user.TenantId);

        return MapToResponse(user);
    }

    public async Task<UserResponse> UpdateUserRoleAsync(int id, UpdateUserRoleRequest request)
    {
        // Interdire la promotion vers Admin
        if (request.Role == UserRole.Admin)
            throw new ApiErrorException(ApiError.InvalidRole);

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new ApiErrorException(ApiError.UserNotFound);

        // Interdire de changer son propre rôle
        if (user.Id == GetCurrentUserId())
            throw new ApiErrorException(ApiError.CannotChangeOwnRole);

        user.Role = request.Role;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} role updated to {Role}", id, request.Role);

        return MapToResponse(user);
    }

    public async Task DeactivateUserAsync(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new ApiErrorException(ApiError.UserNotFound);

        // Interdire de se désactiver soi-même
        if (user.Id == GetCurrentUserId())
            throw new ApiErrorException(ApiError.CannotDeactivateSelf);

        user.IsActive = false;
        user.UpdatedAt = DateTime.UtcNow;

        // Révoquer tous les refresh tokens (forcer la déconnexion)
        var tokens = await _db.RefreshTokens
            .IgnoreQueryFilters()
            .Where(r => r.UserId == id && r.RevokedAt == null)
            .ToListAsync();

        foreach (var token in tokens)
        {
            token.RevokedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} deactivated", id);
    }

    public async Task ReactivateUserAsync(int id)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new ApiErrorException(ApiError.UserNotFound);

        user.IsActive = true;
        user.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} reactivated", id);
    }

    private async Task CheckUserLimitAsync()
    {
        var tenant = await _db.Tenants
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(t => t.Id == _tenantContext.TenantId);

        if (tenant?.Configuration == null)
            return;

        try
        {
            using var doc = JsonDocument.Parse(tenant.Configuration);
            if (doc.RootElement.TryGetProperty("maxUsers", out var maxUsersProp))
            {
                var maxUsers = maxUsersProp.GetInt32();
                var activeUserCount = await _db.Users.CountAsync(u => u.IsActive);

                if (activeUserCount >= maxUsers)
                {
                    var message = string.Format(
                        "Vous avez atteint la limite de {0} utilisateurs de votre abonnement",
                        maxUsers);
                    throw new ApiErrorException(ApiError.UserLimitReached, message);
                }
            }
        }
        catch (ApiErrorException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse tenant configuration for user limit check");
        }
    }

    private int GetCurrentUserId()
    {
        var claim = _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        if (claim == null || !int.TryParse(claim.Value, out var userId))
            throw new ApiErrorException(ApiError.Unauthorized);
        return userId;
    }

    private static UserResponse MapToResponse(BackEnd.Shared.Entities.User user)
    {
        return new UserResponse
        {
            Id = user.Id,
            Email = user.Email,
            FirstName = user.FirstName ?? string.Empty,
            LastName = user.LastName ?? string.Empty,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}
