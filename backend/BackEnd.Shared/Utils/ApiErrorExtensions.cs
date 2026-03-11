using System.Reflection;
using BackEnd.Shared.Enums;

namespace BackEnd.Shared.Utils;

public static class ApiErrorExtensions
{
    public static (int Status, string Message) GetInfo(this ApiError error)
    {
        var field = error.GetType().GetField(error.ToString());
        var attribute = field?.GetCustomAttribute<ApiErrorInfoAttribute>();

        return attribute != null
            ? (attribute.Status, attribute.Message)
            : (500, "Une erreur inattendue s'est produite");
    }
}
