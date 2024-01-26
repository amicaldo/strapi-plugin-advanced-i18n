import _ from 'lodash';
import contentTypes from '../../services/contentTypes';
import entities from '../../services/entities';
import database from '../../services/database';
import type { Subscriber } from '@strapi/database/dist/lifecycles';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';
import type { DatabaseService, EntityService } from '../../services/index.d';

const subscriber: Subscriber = async (event) => {
  const { action } = event;
  if (!action.startsWith('beforeCreate') && !action.startsWith('beforeUpdate')) return;

  const eventInfo = await database().getEventInfo(event);
  const contentType = _.get(eventInfo, 'contentType');
  if (!contentType) return;

  const isLocalizedContentType = strapi
    .service('plugin::i18n.content-types')
    .isLocalizedContentType(contentType);
  if (!isLocalizedContentType) return;

  const data = _.get(event, 'params.data');
  if (!data) return;

  const relationAttrNames = Object.keys(
    contentTypes().getRelationTargets(contentType)
  ).filter((attrname) => _.has(data, attrname));
  if (!relationAttrNames || _.isEmpty(relationAttrNames)) return;

  const operations = [];

  if (action.startsWith('beforeCreate')) {
    operations.push(handleCreation(contentType, data, relationAttrNames));
  }

  if (action.startsWith('beforeUpdate')) {
    operations.push(...(await handleUpdate(eventInfo, data, relationAttrNames)));
  }

  const success = !!(await Promise.all(operations)).find((result) => result);
  if (!success) return;

  for (const attrName of relationAttrNames) {
    if (_.has(data, `${attrName}.connect`)) {
      _.unset(data, `${attrName}.connect`);
      continue;
    }
    _.unset(data, attrName);
  }
};

export default subscriber;

async function handleCreation(
  contentType: ContentType,
  data: any,
  relationAttrNames: string[]
) {
  const localizationsConnect = _.get(data, 'localizations', []);
  if (_.isEmpty(localizationsConnect)) return;

  const localizationsConnectIds = database().getIdsToConnect(localizationsConnect) || [];
  if (_.isEmpty(localizationsConnectIds)) return;

  const localizationData = await entities().getLocalizationData(
    contentType,
    _.first(localizationsConnectIds)
  );
  const localizations = _.get(localizationData, 'localizations', []);
  localizations.push(localizationData);

  return setRelationsOnMain(contentType, localizations, data, relationAttrNames);
}

async function handleUpdate(
  eventInfo: DatabaseService.EventInfo,
  data: any,
  relationAttrNames: string[]
) {
  const contentType = _.get(eventInfo, 'contentType');
  const targetIds = _.get(eventInfo, 'targetIds', []);
  if (_.isEmpty(targetIds)) return;

  const operations = [];

  for (const id of targetIds) {
    const localizationData = await entities().getLocalizationData(contentType, id);
    const localizations = _.get(localizationData, 'localizations', []);

    const operation = setRelationsOnMain(
      contentType,
      localizations,
      data,
      relationAttrNames
    );
    if (operation) operations.push(operation);
  }

  return operations;
}

async function setRelationsOnMain(
  contentType: ContentType,
  localizations: EntityService.Entity[],
  data: any,
  relationAttrNames: string[]
) {
  const mainLocalizationId = await entities().getMainLocalizationId(localizations);
  if (!mainLocalizationId) return false;

  return strapi.entityService.update(contentType.uid, mainLocalizationId, {
    data: _.pick(data, relationAttrNames),
  });
}
