import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function ChartSelector({
  onValueChange,
  options,
}: {
  onValueChange: (value: string) => void;
  options: string[];
}) {
  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger className="mb-2 ml-auto w-[160px] text-xs">
        <SelectValue placeholder={options[0]} className="text-xs" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option, idx) => (
          <SelectItem
            key={`${idx}-${option}`}
            className="text-xs"
            value={option}
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
