import _ from 'lodash';
import type { Event } from '@strapi/database/dist/lifecycles';
import type { DatabaseService } from './index.d';

export default () => ({
  getEventInfo,
  getConnections,
});

async function getEventInfo(event: Event) {
  const where = _.get(event, 'params.where');
  const action = _.get(event, 'action');
  const contentType = strapi.contentTypes[event.model.uid];
  if (!contentType) return null;

  const preQueryAction = !action.endsWith('Many') ? 'findOne' : 'findMany';
  const preQueryResult = await strapi.db
    .query(contentType.uid)
    [preQueryAction]({
      where,
      select: ['id'],
    });

  return {
    contentType,
    targetIds: _.isArray(preQueryResult)
      ? preQueryResult.map(({ id }) => id)
      : [preQueryResult?.id],
  } as DatabaseService.EventInfo;
}

function getConnections(
  attrValue: DatabaseService.RelationFieldInput
): { id: number }[] | undefined {
  if (_.isArray(attrValue)) {
    return attrValue.flatMap((v) => getConnections(v));
  }

  if (_.isFinite(attrValue)) {
    return [{ id: attrValue as number }];
  }

  if (_.isObject(attrValue)) {
    if (_.has(attrValue, 'id')) {
      return [attrValue as { id: number }];
    }

    if (_.has(attrValue, 'connect')) {
      return getConnections(_.get(attrValue, 'connect'));
    }
  }
}
