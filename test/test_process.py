from typing import List

import numpy


def bad_local_mean(data: List[int], window=3):

    data.insert(0, 0)

    integral_data = [sum(data[:i]) for i in range(1, len(data) + 1)]

    sum_data = [
        o - a for a, o in zip(integral_data[:-(window)], integral_data[window:])
    ]

    mean_data = [d / window for d in sum_data]

    int_data = [int(d) for d in mean_data]

    return int_data


def good_local_mean(data: List[int], window=3):

    data.insert(0, 0)

    integral_data = numpy.cumsum(numpy.asarray(data, dtype=int))

    sum_data = integral_data[window:] - integral_data[:-(window)]

    mean_data = sum_data / window

    int_data = mean_data

    return int_data


if __name__ == "__main__":

    # get a cumulative sum of values 0-99
    avg_data = bad_local_mean(list(range(10000)))

    avg_data = bad_local_mean(list(range(10000)))

    for i, d in enumerate(avg_data, start=1):

        assert i == d

    avg_data = good_local_mean(list(range(10000)))
