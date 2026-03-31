using System.Security.Claims;
using System.Text.Json;
using BackEnd.Shared.Enums;
using BackEnd.Shared.Exceptions;
using Microsoft.AspNetCore.Http;

namespace BackEnd.API.Services;

public static class ServiceHelpers
{
    public static DateOnly? ParseDateOnly(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return DateOnly.TryParse(value, out var date) ? date : null;
    }

    public static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static int GetCurrentUserId(IHttpContextAccessor httpContextAccessor)
    {
        var userIdClaim = httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null)
            throw new ApiErrorException(ApiError.Unauthorized);
        return int.Parse(userIdClaim.Value);
    }

    public static Dictionary<string, JsonElement> ParseCustomFieldsJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new Dictionary<string, JsonElement>();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)
                   ?? new Dictionary<string, JsonElement>();
        }
        catch (JsonException)
        {
            return new Dictionary<string, JsonElement>();
        }
    }

    public static bool IsElementString(object? element, out string value)
    {
        if (element is not null)
        {
            if (element is string s)
            {
                value = s;
                return true;
            }
            if (element is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.String)
            {
                value = jsonElement.GetString() ?? string.Empty;
                return true;
            }

            value = string.Empty;
            return false;
        }

        value = string.Empty;
        return true;
    }

    public static bool IsElementNumber(object? element)
    {
        if (element is decimal) return true;
        if (element is int) return true;
        if (element is float) return true;
        if (element is JsonElement jsonElement && jsonElement.ValueKind == JsonValueKind.Number) return true;
        return false;
    }
}
