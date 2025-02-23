import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ChartSelector<T extends string>({
  onValueChange,
  options,
  id,
}: {
  onValueChange: (value: T) => void;
  options: (T | {label: string , value: T})[];
  id?: string
}) {
  const cleanOptions = options.map((option) => {
    if (typeof option === 'string') {
      return {
        label: option,
        value:option
      }
    }
    return option
  })


  return (
    <Select onValueChange={onValueChange} >
      <SelectTrigger className="mb-2 w-[160px] text-xs" id={id}>
        <SelectValue placeholder={cleanOptions[0].label} className="text-xs" />
      </SelectTrigger>
      <SelectContent>
        {cleanOptions.map((option, idx) => (
          <SelectItem
            key={`${idx}-${option}`}
            className="text-xs"
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
