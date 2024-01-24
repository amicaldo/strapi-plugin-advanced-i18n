import _ from 'lodash';
import contentTypes from '../../services/contentTypes';
import entities from '../../services/entities';
import type { Subscriber } from '@strapi/database/dist/lifecycles';
import type { ContentType } from '@strapi/types/dist/types/core/schemas';
import database from '../../services/database';

const subscriber: Subscriber = async (event) => {
  const { action } = event;
  if (!action.startsWith('beforeCreate') && !action.startsWith('beforeUpdate')) return;

  const eventInfo = await database().getEventInfo(event);
  const contentType = _.get(eventInfo, 'contentType');
  const targetIds = _.get(eventInfo, 'targetIds');
  if (!contentType || _.isEmpty(targetIds)) return;

  const isLocalizedContentType = strapi
    .service('plugin::i18n.content-types')
    .isLocalizedContentType(contentType);
  if (!isLocalizedContentType) return;

  const data = _.get(event, 'params.data');
  if (!data) return;

  const relationAttrNames = Object.keys(
    contentTypes().getRelationTargets(contentType)
  ).filter((attrname) => _.has(data, attrname));
  if (_.isEmpty(relationAttrNames)) return;

  const operations = [];
  for (const id of targetIds) {
    const operation = setRelationsOnMain(contentType, id, data, relationAttrNames);
    if (operation) operations.push(operation);
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

async function setRelationsOnMain(
  contentType: ContentType,
  entityId: number,
  data: any,
  relationAttrNames: string[]
) {
  const { localizations } = await entities().getLocalizationData(contentType, entityId);
  if (_.isEmpty(localizations)) return false;

  const mainLocalizationId = await entities().getMainLocalizationId(localizations);
  if (!mainLocalizationId) return false;

  return strapi.entityService.update(contentType.uid, mainLocalizationId, {
    data: _.pick(data, relationAttrNames),
  });
}
