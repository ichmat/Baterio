using System;
using System.Collections.Generic;
using System.Text;

namespace BackEnd.Shared.Models.CustomFields
{
    public class CustomFieldEntry
    {
        public int Id { get; set; }
        public string Label { get; set; } = null!;
        public object? Value { get; set; }
    }
}
