import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  MdArrowDownward,
  MdArrowUpward,
  MdDelete,
  MdEdit,
} from "react-icons/md";
import * as yup from "yup";
import { useAuth } from "../store/use-auth";
import { supabase } from "../supabase";
import { LoggedUser } from "./logged-user";

interface ITodo {
  title: string;
  created_at: string;
  id: number;
  completed: boolean;
}

interface ITodoForm extends Omit<ITodo, "created_at" | "id" | "completed"> {}

type IOrderBy = "title" | "completed" | "created_at";

type IFilter = "ALL" | "COMPLETED" | "ACTIVE";

const schema = yup.object().shape({
  title: yup
    .string()
    .required("is required motherfucker")
    .min(3, "min")
    .max(10, "max"),
});

interface Props {
  todo: ITodo;
  todosKey: (
    | string
    | {
        ascending: boolean;
      }
  )[];
}
function TodoItem({ todo, todosKey }: Props) {
  const [edit, setEdit] = useState(false);
  const enableEdit = () => setEdit(true);

  const client = useQueryClient();

  const { register, getValues } = useForm({
    defaultValues: {
      title: todo.title,
    },
  });

  const { mutate: updateTodo, isLoading } = useMutation({
    mutationKey: ["updateTodo"],
    mutationFn: async ({ title, id }: { title: string; id: number }) => {
      return supabase
        .from("todos")
        .update({
          title,
        })
        .eq("id", id);
    },
    onSuccess: async (_, dataSent) => {
      const todosCached = client.getQueryData(todosKey) as ITodo[];
      const newTodos = todosCached.map((todo) =>
        todo.id === dataSent.id ? { ...todo, title: dataSent.title } : todo
      );
      client.setQueryData(todosKey, newTodos);
      setEdit(false);
    },
  });

  const { mutate: deleteTodo, isLoading: isLoadingDelete } = useMutation({
    mutationKey: ["removeTodos"],
    mutationFn: async (id: number) => {
      return supabase.from("todos").delete().eq("id", id);
    },
    onSuccess: async (_, id) => {
      const todosCached = client.getQueryData(todosKey) as ITodo[];
      const newTodos = todosCached.filter((todo) => todo.id !== id);
      client.setQueryData(todosKey, newTodos);
    },
  });

  const { mutate: toggleTodo, isLoading: isLoadingToggle } = useMutation({
    mutationKey: ["toggleTodos"],
    onMutate: async ({ completed, id }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await client.cancelQueries({ queryKey: todosKey });

      const previousValue = client.getQueryData<ITodo[]>(todosKey) || [];

      const newTodos = previousValue.map((todo) =>
        todo.id === id ? { ...todo, completed } : todo
      ) as ITodo[];

      client.setQueryData(todosKey, newTodos);

      return previousValue;
    },
    mutationFn: async ({
      completed,
      id,
    }: {
      completed: boolean;
      id: number;
    }) => {
      return supabase.from("todoas").update({ completed }).eq("id", id);
    },
    // If the mutation fails,
    // use the context returned from onMutate to roll back
    // Test with other table Policy to throw error and restore previous value
    // onError: (err, newTodo, context) => {
    //   console.log(err);
    //   client.setQueryData(todosKey, context?.previousTodos || []);
    // },
    // Always refetch after error or success:
    // onSettled: () => {
    //   client.invalidateQueries({ queryKey: todosKey });
    // },
  });

  if (edit) {
    return (
      <div>
        <input {...register("title")} defaultValue={todo.title} type="text" />
        <button
          type="button"
          disabled={isLoading}
          onClick={() => {
            updateTodo({
              title: getValues("title"),
              id: todo.id,
            });
          }}
        >
          save
        </button>
      </div>
    );
  }

  return (
    <div key={todo.id}>
      <input
        type="checkbox"
        checked={todo.completed}
        disabled={isLoadingToggle}
        onChange={(ev) => {
          // handle complete here
          toggleTodo({ id: todo.id, completed: ev.target.checked });
        }}
      />
      {todo.title}{" "}
      <button onClick={enableEdit} type="button" disabled={isLoadingDelete}>
        <MdEdit />
      </button>
      <button
        type="button"
        disabled={isLoadingDelete}
        onClick={() => {
          deleteTodo(todo.id);
        }}
      >
        <MdDelete />
      </button>
    </div>
  );
}

function searchParamsFilter(
  key: "orderBy" | "filter" | "isAscending",
  defaultValue: IOrderBy | IFilter | boolean
) {
  const search = new URLSearchParams(location.search);
  const filterParam = search.get("filter");

  if (key === "filter" && filterParam) {
    try {
      const parsedFilter = JSON.parse(filterParam) as {
        [key in "orderBy" | "filter" | "isAscending"]?:
          | IOrderBy
          | IFilter
          | boolean;
      };
      return parsedFilter[key] ?? defaultValue;
    } catch (error) {
      console.error("Error parsing filter parameter:", error);
      return defaultValue;
    }
  }

  return defaultValue;
}

export function Todos() {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ITodoForm>({
    defaultValues: {
      title: "",
    },
    resolver: yupResolver(schema),
  });

  const client = useQueryClient();

  const [isAscending, setIsAscending] = useState(() => {
    return searchParamsFilter("isAscending", true) as boolean;
  });

  const [orderBy, setOrderBy] = useState<IOrderBy>(() => {
    return searchParamsFilter("orderBy", "created_at") as IOrderBy;
  });

  const [filter, setFilter] = useState<IFilter>(() => {
    return searchParamsFilter("filter", "ALL") as IFilter;
  });

  const todosKey = ["todos", { ascending: isAscending, orderBy, filter }];

  const { data: todos, isLoading } = useQuery(
    todosKey,
    async () => {
      const instance = supabase
        .from("todos")
        .select<string, ITodo>("id,created_at,title,completed")
        .eq("user_id", String(user?.id));

      if (filter !== "ALL") {
        const map: Record<Exclude<IFilter, "ALL">, boolean> = {
          COMPLETED: true,
          ACTIVE: false,
        };
        instance.eq("completed", map[filter]);
      }
      instance.order(orderBy, {
        ascending: isAscending,
      });
      const { data } = await instance;
      return data;
    },
    {
      enabled: !!user?.id,
    }
  );

  const { mutate: storeTodo } = useMutation({
    mutationKey: ["storeTodo"],
    mutationFn: async (title: string) => {
      return supabase
        .from("todos")
        .insert({
          title,
        })
        .select<string, ITodo>("id,created_at,title,completed");
    },
    onSuccess: (response) => {
      reset();

      const todosCached = client.getQueryData(todosKey) as ITodo[];
      const newTodo = (response?.data?.[0] || {}) as ITodo;
      const newTodos = todosCached.concat(newTodo);
      client.setQueryData(todosKey, newTodos);
    },
  });

  const submit = (data: ITodoForm) => {
    storeTodo(data.title);
  };

  useEffect(() => {
    const filters = {
      orderBy,
      filter,
      isAscending,
    };
    const searchParams = new URLSearchParams();
    searchParams.set("filter", JSON.stringify(filters));
    window.history.replaceState({}, "", "?" + searchParams.toString());
  }, [isAscending, orderBy, filter]);

  return (
    <div>
      <header>
        <LoggedUser />
      </header>
      <form onSubmit={handleSubmit(submit)}>
        <input placeholder="New todo" {...register("title")} type="text" />
        <p>{errors.title?.message}</p>
      </form>

      <div style={{ marginBlock: 12 }}>
        order by:
        <select
          defaultValue={orderBy}
          onChange={(ev) => setOrderBy(ev.target.value as IOrderBy)}
        >
          <option value="" disabled>
            order by
          </option>
          <option value="title">title</option>
          <option value="created_at">created at</option>
          <option value="completed">completed</option>
        </select>
        <button onClick={() => setIsAscending(!isAscending)}>
          {isAscending ? <MdArrowUpward /> : <MdArrowDownward />}
        </button>
        <label htmlFor="_1">
          <input
            id="_1"
            type="radio"
            name="filter"
            value="ALL"
            checked={filter === "ALL"}
            onChange={(e) => setFilter(e.target.value as IFilter)}
          />
          Show All
        </label>
        <label htmlFor="_2">
          <input
            id="_2"
            type="radio"
            name="filter"
            value="COMPLETED"
            checked={filter === "COMPLETED"}
            onChange={(e) => setFilter(e.target.value as IFilter)}
          />
          Completed
        </label>
        <label htmlFor="_3">
          <input
            id="_3"
            type="radio"
            name="filter"
            value="ACTIVE"
            checked={filter === "ACTIVE"}
            onChange={(e) => setFilter(e.target.value as IFilter)}
          />
          Active
        </label>
      </div>

      {isLoading && "loading..."}
      {todos?.map((i) => (
        <TodoItem key={i.id} todo={i} todosKey={todosKey} />
      ))}
    </div>
  );
}
