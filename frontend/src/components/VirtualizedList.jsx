import React from 'react';
import { FixedSizeList } from 'react-window';

const VirtualizedList = React.memo(function VirtualizedList({
  items,
  height = 520,
  itemSize = 72,
  overscanCount = 6,
  renderItem,
  className,
}) {
  const Row = React.useCallback(({ index, style }) => (
    <div style={style}>
      {renderItem(items[index], index)}
    </div>
  ), [items, renderItem]);

  if (!Array.isArray(items) || items.length === 0) return null;

  if (items.length <= 50) {
    return (
      <div className={className}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  return (
    <FixedSizeList
      className={className}
      height={height}
      itemCount={items.length}
      itemSize={itemSize}
      overscanCount={overscanCount}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
});

export default VirtualizedList;
