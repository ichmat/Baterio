using System.Security.Claims;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using BackEnd.Shared.Interfaces;
using Serilog.Context;

namespace BackEnd.API.Infrastructure;

public class TenantMiddleware
{
    private readonly RequestDelegate _next;
    private static readonly HashSet<string> PublicPaths = new(StringComparer.OrdinalIgnoreCase)
    {
        "/api/auth/login",
        "/api/auth/refresh",
        "/api/health"
    };

    public TenantMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        var path = context.Request.Path.Value ?? string.Empty;

        if (PublicPaths.Contains(path))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = context.User.FindFirst("tenant_id")?.Value;
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(tenantClaim, out var tenantId) || tenantId <= 0)
            {
                throw new ApiErrorException(ApiError.Unauthorized);
            }

            tenantContext.TenantId = tenantId;

            // LogContext properties kept alive for the entire request pipeline
            var tenantProp = LogContext.PushProperty("TenantId", tenantId);
            var userProp = LogContext.PushProperty("UserId", userIdClaim);
            try
            {
                await _next(context);
            }
            finally
            {
                userProp.Dispose();
                tenantProp.Dispose();
            }
            return;
        }

        await _next(context);
    }
}
