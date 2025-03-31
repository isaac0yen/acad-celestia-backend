# defined values
defined_values = {
  "I": 1,
  "V": 5,
  "X": 10,
  "L": 50,
  "C": 100,
  "D": 500,
  "M": 1000
}

# Ask the user for an input
user_value = input("What value do you want to convert?").upper()

def convert_roman_to_int(roman_numeral):
  last_letter = ""
  total_value = 0
  for i in roman_numeral:
    if i not in defined_values:
      return "Invalid input"

    if roman_numeral.index(i) < 1:
      total_value += defined_values[i]
      last_letter = i
    else:
      if defined_values[i] > defined_values[last_letter]:
        total_value = defined_values[i] - defined_values[last_letter]
      else:
        total_value += defined_values[i]
  return total_value

print(convert_roman_to_int(user_value))
