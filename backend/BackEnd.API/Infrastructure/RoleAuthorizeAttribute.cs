using System.Security.Claims;
using BackEnd.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace BackEnd.API.Infrastructure;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RoleAuthorizeAttribute : AuthorizeAttribute, IAuthorizationFilter
{
    private readonly UserRole[] _roles;

    public RoleAuthorizeAttribute(params UserRole[] roles)
    {
        _roles = roles;
    }

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;

        if (!user.Identity?.IsAuthenticated ?? true)
        {
            context.Result = new JsonResult(new
            {
                type = "ApiError",
                code = "Unauthorized",
                status = 401,
                message = "Non autorisé"
            })
            {
                StatusCode = 401
            };
            return;
        }

        var roleClaim = user.FindFirst(ClaimTypes.Role)?.Value ?? user.FindFirst("role")?.Value;

        if (roleClaim == null || !Enum.TryParse<UserRole>(roleClaim, out var userRole) || !_roles.Contains(userRole))
        {
            context.Result = new JsonResult(new
            {
                type = "ApiError",
                code = "Forbidden",
                status = 403,
                message = "Accès interdit"
            })
            {
                StatusCode = 403
            };
        }
    }
}
