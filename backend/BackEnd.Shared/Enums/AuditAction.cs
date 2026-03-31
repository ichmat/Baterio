using System.Text.Json.Serialization;

namespace BackEnd.Shared.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AuditAction
{
    Created,
    Updated,
    StatusChanged,
    CommentAdded,
    FileAttached,
    FileRemoved,
    Deleted
}
