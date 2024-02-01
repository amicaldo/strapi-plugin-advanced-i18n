# Advanced Internationalization for Strapi

Strapi's Internationalization plugin proves to be cumbersome when it comes to **relations**, because of the plugin **forcefully localizing** those kinds of fields.
Additionally, it doesn't support the `locale` parameter on **findOne** routes.
This plugin extends the default i18n plugin in your strapi project to solve these problems.
### Functionality
The i18n plugin provides an option to change the **default locale**, this plugin builds on that.

- Localizations in your specific default locale are considered the main-entity.
- When connecting relations pointing to a localized content-type, that connection data will be altered so it points to a main-entity, if existing.
- When connecting relations from a localized content-type, that connection data will always be written onto the main-entity, if existing.
- Requests containing an `id` and `locale` parameter *(e.g. findOne)*, but having these parameters  mismatched *(the id is from an entity that has another locale)*, will get the `id` param corrected.
- Responses will be, based on the routes content-type schema, altered recursively, so all entities in there get represented as a main-entity, but localized. This means: Relations will be localized, IDs and relations are taken from the main-entity instead of the localization.

Telling the plugin to spare certain relation fields, works by adding plugin-options in your schema. 
```
"attributes": {
	"name": {
		"type": "string",
		"required": true,
		"pluginOptions": {
			"i18n": {
				"localized": true
			},
			"advanced-i18n": false <-- HERE
		}
	}
}
```

### Installation
```
npm i @amicaldo/strapi-plugin-advanced-i18n
```

### Development Setup
Clone the repo and start compilation in watch-mode.
```
git clone https://github.com/amicaldo/strapi-plugin-advanced-i18n.git
```

From your strapi project root and create a link to the plugin's dist folder.
```
ln -s /path/to/plugin/dist src/plugins/advanced-i18n
```

 Edit your plugins config file.
 ```
// ... 
"advanced-i18n": {
	enabled: true,
	resolve: "src/plugins/advanced-i18n",
},
// ...
 ```
