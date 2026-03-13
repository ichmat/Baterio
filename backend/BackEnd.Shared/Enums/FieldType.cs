using System.Text.Json.Serialization;

namespace BackEnd.Shared.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum FieldType
{
    Text,
    Number,
    SingleChoice,
    MultipleChoice,
    Date
}
