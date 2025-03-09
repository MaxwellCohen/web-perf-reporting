/* eslint-disable @typescript-eslint/no-explicit-any */
import { RenderJSONDetails } from '../RenderJSONDetails';
import { Timeline } from '../Timeline';
import {
  AuditResult,
} from '@/lib/schema';
import { RenderChecklist } from './RenderChecklist';
import { RenderUnknown } from './RenderUnknown';
import { DetailTable } from './table/RenderTable';

export function RenderDetails({
    desktopAuditData,
    mobileAuditData,
  }: {
    desktopAuditData?: AuditResult[string];
    mobileAuditData?: AuditResult[string];
  }) {
    if (!desktopAuditData?.details) {
      return null;
    }
    if (!mobileAuditData?.details) {
      return null;
    }
  
    const details = desktopAuditData.details;
    console.log('list', details);
    switch (details.type) {
      case 'filmstrip':
        return <Timeline timeline={details} device={'Desktop'} />;
      case 'list':
        console.log('list', details);
        return (
          <RenderList
            desktopAuditData={desktopAuditData}
            mobileAuditData={mobileAuditData}
          />
        );
      case 'checklist':
        return (
          <RenderChecklist
            desktopAuditData={desktopAuditData}
            mobileAuditData={mobileAuditData}
          />
        );
      case 'table':
      case 'opportunity':
        console.log('table', details);
        return (
          <DetailTable
            device={'Desktop'}
            headings={details.headings}
            items={details.items}
            isEntityGrouped={details.isEntityGrouped}
            skipSumming={details.skipSumming}
            sortedBy={details.sortedBy}
            entities={details.entities}
          />
        );
      case 'criticalrequestchain':
        // return CriticalRequestChainRenderer.render(this._dom, details, this);
        return (
          <div>
            Critical Request Chain
            <pre>{JSON.stringify(details, null, 2)}</pre>
          </div>
        );
      // Internal-only details, not for rendering.
      case 'screenshot':
        return null;
      // case 'debugdata':
      case 'treemap-data':
        return <RenderJSONDetails data={details} />;
  
      default:
        return <RenderUnknown details={details} />;
    }
  }
  
  function RenderList({
    desktopAuditData,
    mobileAuditData,
  }: {
    desktopAuditData?: AuditResult[string];
    mobileAuditData?: AuditResult[string];
  }) {
    const details = desktopAuditData?.details;
    if (details.type !== 'list') {
      return null;
    }
    return (
      <div>
        {details.items.map((item: any, index: number) => {
          console.log('item', item);
          switch (item.type) {
            case 'filmstrip':
              return <Timeline key={index} timeline={item} device={'Desktop'} />;
            case 'list':
              console.log('list', details);
              return (
                <RenderList
                  key={index}
                  desktopAuditData={item}
                  mobileAuditData={mobileAuditData?.details?.items[index]}
                />
              );
            case 'checklist':
              return (
                <RenderChecklist
                  key={index}
                  desktopAuditData={item}
                  mobileAuditData={mobileAuditData?.details?.items[index]}
                />
              );
            case 'table':
            case 'opportunity':
              console.log('table', details);
              return (
                <DetailTable
                  key={index}
                  device={'Desktop'}
                  headings={item.headings}
                  items={item.items}
                  isEntityGrouped={item.isEntityGrouped}
                  skipSumming={item.skipSumming}
                  sortedBy={item.sortedBy}
                  entities={item.entities}
                />
              );
            case 'criticalrequestchain':
              // return CriticalRequestChainRenderer.render(this._dom, details, this);
              return (
                <div key={index}>
                  Critical Request Chain
                  <pre>{JSON.stringify(details, null, 2)}</pre>
                </div>
              );
            // Internal-only details, not for rendering.
            // case 'screenshot':
            // case 'debugdata':
            // case 'treemap-data':
            //   return null;
  
            default:
              return <RenderUnknown key={index} details={details} />;
          }
        })}
      </div>
    );
  }
  
  
  
  