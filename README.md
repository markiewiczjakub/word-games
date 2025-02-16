# Word Games API

Welcome to the Word Games API! This API allows you to interact with various word games. Below are the available routes and their descriptions.

## Routes

### GET /validate/{word}?letters=xyz

Validate if the given word is in the dictionary and contains only the specified letters. This validation is currently for the Polish alphabet.

**Parameters:**

- `word` (path): The word to validate.
- `letters` (query): The letters that the word should contain.

**Response:**

```json
{
  "valid": true
}
```

**Examples:**

"pies" with letters "pse":

```
GET /validate/pies?letters=pse
```

Response:

```json
{
  "valid": false
}
```

"kajak" with letters "kjam":

```
GET /validate/kajak?letters=kjam
GET /validate/jak?letters=kjam
GET /validate/maj?letters=kjam
GET /validate/ma?letters=kjam
GET /validate/ja?letters=kjam
```

Response for all:

```json
{
  "valid": true
}
```
